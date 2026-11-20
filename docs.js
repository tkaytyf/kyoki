(function () {
  "use strict";

  var search = document.getElementById("docs-search");
  var guides = Array.prototype.slice.call(document.querySelectorAll(".docs-guide"));
  var links = Array.prototype.slice.call(document.querySelectorAll(".docs-side-nav a"));
  var empty = document.querySelector(".docs-empty");

  function apply() {
    var query = (search && search.value ? search.value : "").trim().toLowerCase();
    var visible = 0;
    guides.forEach(function (guide) {
      var hay = (guide.getAttribute("data-search") || guide.textContent || "").toLowerCase();
      var show = !query || hay.indexOf(query) !== -1;
      guide.hidden = !show;
      if (show) visible += 1;
    });
    links.forEach(function (link) {
      var id = (link.getAttribute("href") || "").replace("#", "");
      var guide = document.getElementById(id);
      link.hidden = !!(guide && guide.hidden);
    });
    if (empty) empty.hidden = visible !== 0;
  }

  if (search) search.addEventListener("input", apply);

  function currentFromHash() {
    var id = (location.hash || "").replace("#", "");
    links.forEach(function (link) {
      var match = link.getAttribute("href") === "#" + id;
      if (match) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    });
  }
  window.addEventListener("hashchange", currentFromHash);
  currentFromHash();
})();
