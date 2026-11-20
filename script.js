(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Mobile menu: CTA stays in document flow at the bottom of the list. */
  var toggle = document.querySelector(".menu-toggle");
  var nav = document.getElementById("site-menu");

  function setMenu(open) {
    if (!toggle || !nav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    nav.classList.toggle("is-open", open);
  }

  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") setMenu(false);
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        setMenu(false);
      });
    });
    window.addEventListener("resize", function () {
      if (window.innerWidth > 1279) setMenu(false);
    });
  }

  /* Scroll reveal */
  var reveals = document.querySelectorAll("[data-reveal]");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    reveals.forEach(function (el) {
      observer.observe(el);
    });
  }

  /* Command search and filters live in commands-app.js */

  /* Theme: stored choice wins, otherwise prefers-color-scheme */
  function currentTheme() {
    try {
      var stored = localStorage.getItem("kyoki-theme");
      if (stored === "light" || stored === "dark") return stored;
    } catch (e) {}
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) return "light";
    return "dark";
  }
  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    var btn = document.querySelector(".theme-toggle");
    if (btn) btn.setAttribute("aria-label", theme === "light" ? "Switch to dark mode" : "Switch to light mode");
  }
  function ensureToggle() {
    if (document.querySelector(".theme-toggle")) return;
    var header = document.querySelector(".nav-inner");
    var menu = document.querySelector(".menu-toggle");
    if (!header) return;
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "theme-toggle";
    btn.setAttribute("aria-label", "Switch theme");
    btn.innerHTML = '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 14.5A7 7 0 0 1 9.5 4.2 7.5 7.5 0 1 0 16.5 14.5z"/></svg><svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path stroke-linecap="round" d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/></svg>';
    btn.addEventListener("click", function () {
      var next = currentTheme() === "light" ? "dark" : "light";
      try { localStorage.setItem("kyoki-theme", next); } catch (e) {}
      applyTheme(next);
    });
    header.appendChild(btn);
  }
  ensureToggle();
  applyTheme(currentTheme());

  /* Homepage intro: lazy-load, autoplay when in view, poster only if reduced motion */

  /* Lazy videos: poster only when the user prefers reduced motion. */
  document.querySelectorAll("video[data-src]").forEach(function (intro) {
    var frame = intro.closest(".intro-frame, .press-video-frame, figure");
    if (reduceMotion) {
      if (frame && frame.classList.contains("intro-frame")) frame.classList.add("is-static");
      intro.removeAttribute("autoplay");
      intro.pause();
      return;
    }
    function loadAndPlay() {
      var src = intro.getAttribute("data-src");
      if (src && !intro.getAttribute("src")) {
        intro.src = src;
        intro.preload = "metadata";
      }
      var play = intro.play();
      if (play && play.catch) play.catch(function () {});
    }
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { loadAndPlay(); io.disconnect(); }
        });
      }, { rootMargin: "200px" });
      io.observe(intro);
    } else {
      loadAndPlay();
    }
  });

})();
