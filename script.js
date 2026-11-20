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

  /* Commands: search + category tabs */
  var search = document.getElementById("command-search");
  var tabs = document.querySelectorAll("[data-filter]");
  var commands = document.querySelectorAll(".command");
  var empty = document.querySelector(".commands-empty");
  var category = "all";

  function applyFilter() {
    if (!commands.length) return;
    var query = (search ? search.value : "").trim().toLowerCase();
    var visible = 0;
    commands.forEach(function (item) {
      var cats = (item.getAttribute("data-category") || "").split(/\s+/);
      var inCategory = category === "all" || cats.indexOf(category) !== -1;
      var haystack = (item.getAttribute("data-search") || item.textContent || "").toLowerCase();
      var matches = !query || haystack.indexOf(query) !== -1;
      var show = inCategory && matches;
      item.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible !== 0;
  }

  if (search) search.addEventListener("input", applyFilter);

  tabs.forEach(function (tab) {
    tab.addEventListener("click", function () {
      category = tab.getAttribute("data-filter") || "all";
      tabs.forEach(function (other) {
        var active = other === tab;
        other.classList.toggle("is-active", active);
        other.setAttribute("aria-selected", active ? "true" : "false");
        other.setAttribute("tabindex", active ? "0" : "-1");
      });
      applyFilter();
    });
  });

  if (tabs.length) {
    var tablist = document.querySelector('[role="tablist"]');
    if (tablist) {
      tablist.addEventListener("keydown", function (event) {
        var tabsArr = Array.prototype.slice.call(tabs);
        var current = tabsArr.indexOf(document.activeElement);
        if (current === -1) return;
        var next = current;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % tabsArr.length;
        else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + tabsArr.length) % tabsArr.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabsArr.length - 1;
        else return;
        event.preventDefault();
        tabsArr[next].focus();
        tabsArr[next].click();
      });
    }
  }
})();
